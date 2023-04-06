<?php

namespace DNADesign\Elemental\Controllers;

use Behat\Mink\Element\Element;
use DNADesign\Elemental\Models\BaseElement;
use DNADesign\Elemental\Models\ElementalArea;
use Exception;
use InvalidArgumentException;
use SilverStripe\Control\Controller;
use SilverStripe\Control\HTTPRequest;
use SilverStripe\Control\HTTPResponse;
use SilverStripe\Control\Middleware\HTTPCacheControlMiddleware;
use SilverStripe\ORM\DataObject;

/**
 * Inline editor JSON API endpoints
 * 
 * https://docs.silverstripe.org/en/4/developer_guides/controllers/introduction/
 */
class ApiController extends Controller
{
    private static array $allowed_actions = [
        'areas',
        'publishBlock',
        'invalidRoute'
    ];

    private static array $url_handlers = [
        'GET areas/$@' => 'areas',
        'PUT publishBlock/$@' => 'publishBlock',
        'GET $*' => 'invalidRoute',
        'PUT $*' => 'invalidRoute',
        'POST $*' => 'invalidRoute',
        'DELETE $*' => 'invalidRoute',
    ];

    public function publishBlock(HTTPRequest $request): HTTPResponse
    {
        // match return type from graphql inline publish
        // {"data":{"publishBlock":{"id":"1","__typename":"Block"}}}
        try {
            $obj = $this->getDataObjectFromRequest(BaseElement::class, $request);
            // todo canPublish() check
            if (!$obj->publishRecursive()) {
                throw new Exception("Failed to publish Element with ID {$obj->ID}");
            }
            return $this->jsonResponse([
                'data' => [
                    'publishBlock' => [
                        'id' => $obj->ID,
                        '__typename' => 'Block' // can probably get rid of this later
                    ]
                ]
            ]);
        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    private function getDataObjectFromRequest(string $className, HTTPRequest $request): DataObject
    {
        $id = (int) $request->param('$1');
        if ($id === 0) {
            throw new InvalidArgumentException('Need to specify an ID');
        }
        $obj = $className::get()->byID($id);
        if (is_null($obj)) {
            throw new Exception("DataObject with ID $id does not exist");
        }
        return $obj;
    }

    public function areas(HTTPRequest $request): HTTPResponse
    {
        try {
            $obj = $this->getDataObjectFromRequest(ElementalArea::class, $request);
            // ElementalArea->Elements() method has an unpredictable mixed return type,
            // so querying BaseElement instead
            $filter = ['ParentID' => $obj->ID];
            return $this->jsonResponse([
                'elements' => array_map(fn(BaseElement $element) => [
                    'id' => $element->ID,
                    'title' => $element->Title,
                    'pageEditLink' => $element->TopPage()->Link(),
                    'obsoleteClassName' => $element->obsoleteClassName, // ? works via magic?
                    'isPublished' => $element->isPublished(),
                    'version' => 'todo',
                    'canCreate' => $element->canCreate(),
                    'canPublish' => $element->canPublish(),
                    'canUnpublish' => $element->canUnpublish(),
                    'canDelete' => $element->canDelete(),
                ], BaseElement::get()->filter($filter)->toArray())
            ]);
        } catch (Exception $e) {
            return $this->error($e->getMessage());
        }
    }

    public function invalidRoute(HTTPRequest $request): HTTPResponse
    {
        return $this->error('Invalid route', 404);
    }

    private function error(string $message, int $code = 500): HTTPResponse
    {
        return $this->jsonResponse([
            'error' => $message
        ], $code);
    }

    private function jsonResponse(array $data, int $code = 200): HTTPResponse
    {
        // todo: security
        // todo: canview
        HTTPCacheControlMiddleware::singleton()->disableCache();
        return $this->getResponse()
            ->addHeader('Content-type', 'application/json')
            ->setStatusCode($code)
            ->setBody(json_encode(
                $data,
                JSON_PRETTY_PRINT + JSON_UNESCAPED_SLASHES + JSON_UNESCAPED_UNICODE
            ));
    }
}